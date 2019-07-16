#!/bin/perl
use strict;
use warnings;

my $debug = 0;
my $warnings = 1;
my $base = 'C:/Users/Neil/Code/kiwiirc/kiwiirc/src/';
my $pobase = 'C:/Users/Neil/Code/kiwiirc/kiwiirc/src/res/locales/';
my $pofile = 'app.dev-new.po';

my @patterns = (
    { type => 'param', pre_regex => '[.$]t\(', param => 0 },
    { type => 'param', pre_regex => '\.formatAndT\(', param => 2 },
    { type => 'regex', regex => 'modeLocaleIds\s+=\s+({.*?});', files => ['IrcClient.js'] },
    { type => 'export', files => ['autocompleteCommands.js'], param => 'locale_description' }
);

my %msgids_po;
# key: 'msgid'
# data: 'msgstr'

my %msgids_src;
# key: 'msgid'
# data: { msgstr => {}, files => {}, plural => '' }


########  Main  ########

print "Generating app.dev.po\n";
load_po(\%msgids_po, 'app.dev.po');

# recursively scan the base dir to find files to process
my @paths = ($base);
while (scalar @paths > 0) {
    scan_dir();
}

print_stats();

write_po($pobase.$pofile);


########  Subroutines  ########

sub load_po {
    my ($data, $file) = @_;
    my $last_key = '';

    # read the po file
    open(my $fh, '<:encoding(UTF-8)', $pobase . $file) || die "Could not open file '$pobase $+ $file' $!";
    flock($fh, 2);
    my @lines = <$fh>;
    close($fh);

    # parse lines
    for (my $ln = 0; $ln < scalar @lines; $ln++) {
        my $line = $lines[$ln];
        if ($line =~ m/^msgid\s+"(.*)"$/) {
            $last_key = $1;
        } elsif ($line =~ m/^msgstr\s+"(.*)"$/) {
            if (defined($data->{$last_key})) {
                print "Error: duplicate msgid in $file (L$ln) - '$last_key'\n";
            }
            $data->{$last_key} = $1;
        } elsif ($line =~ m/^#|^$/) {
            # ignore comments and empty lines
        } else {
            $line =~ s/\n//g;
            print "Error: unexpected line in $file (L$ln) - '$line'\n";
        }
    }
}

sub scan_dir {
    my $dir = pop(@paths);

    # sanity check
    if (!defined($dir) || !-d $dir) {
        print "Error: tried to scan a none dir '$dir'\n";
        return
    }
    
    # get directory list
    opendir(my $dh, $dir) || die "Could not open dir '$dir' $!";
    print 'D: ' . $dir . "\n" if ($debug);
    my @files = readdir($dh);
    close($dh);

    foreach my $file (@files) {
        if ($file eq "." || $file eq "..") { 
            next; 
        }
        
        if (-d $dir.$file) {
            # add subdir to the paths array
            push(@paths, $dir.$file.'/');
            next;
        }

        if (!-e $dir.$file || !-f $dir.$file) {
            print "Error: file unexpectedly did not exist '$dir $+ $file'\n";
        }

        if ($file !~ m/\.(vue|js)$/) {
            # is not a file type we are interested in
            next;
        }
        
        process_file($dir.$file);
    }
}

sub process_file {
    my $file_path = shift;
    my $file_name = get_file_path($file_path);
    
    # open and lock the file for reading
    print 'F: ' . $file_name . "\n" if ($debug);
    open(my $fh, '<:encoding(UTF-8)', $file_path) || die "Could not open file '$file_path' $!";
    flock($fh, 2);
    my @file_lines = <$fh>;
    close($fh);

    foreach my $pattern (@patterns) {
        if ($pattern->{type} eq 'param') {
            type_param($file_name, $pattern, @file_lines);
        } 
        elsif ($pattern->{type} eq 'export') {
            type_export($file_name, $pattern, @file_lines);
        }
        elsif ($pattern->{type} eq 'regex') {
            type_regex($file_name, $pattern, @file_lines);
        }
    }
}

sub type_param {
    my ($file_name, $pattern, @file_lines) = @_;
    my $pre_regex = $pattern->{pre_regex};

    # iterate each line
    for (my $ln = 0; $ln < @file_lines; $ln++) {
        # lines from current to the end of file
        my $lines = join('', @file_lines[$ln..@file_lines -1]);
        my $line = $file_lines[$ln];

        # special modifier for TextFormatting.js 
        if ($file_name =~ '/TextFormatting.js$' && $pre_regex =~ m/t\\\($/) {
            $pre_regex = '?:\W(t\()';
        }

        if ($line !~ m/($pre_regex)/) {
            # unwanted line
            next;
        }

        my ($line_prefix, $line_start) = $lines =~ m/($pre_regex)(.*)/si;
        
        my $brackets = 1;
        my $open_quote = 0;
        my $timeout = 10;
        my @line_split = split(//, $line_start);
        my $params_str;

        # iterate over each char
        for (my $tn = 0; $tn < @line_split; $tn++) {
            my $token = $line_split[$tn];
            if ($token =~ m/['"`]/ && $line_split[$tn-1] ne '\\') {
                # track open and closed quotes
                $open_quote = !$open_quote;
            }
            elsif ($token eq '(' && !$open_quote) {
                $timeout--;
                $brackets++;
            }
            elsif ($token eq ')' && !$open_quote){
                $brackets--;
            }
            if ($brackets == 0 || $timeout == 0) {
                if ($timeout == 0) {
                    print "Warning: hit timeout '$file_name' (L$ln)\n" if ($warnings);
                    last;
                }
                my $line_part = join('', @line_split[0..$tn-1]);
                my $line_part_clean = $line_part;
                $line_part_clean =~ s/\s{2}|\r?\n//g;
                print "M: " . $line_prefix . $line_part_clean . ")\n" if ($debug);
                $params_str = $line_part_clean;
                last;
            }
        }

        my @params = parse_params($params_str);
        print 'P: [' . join('], [', @params) . "]\n" if ($debug);
        if (defined($params[$pattern->{param}])) {
            my $msgid = extract_string($params[$pattern->{param}]);
            if (defined($msgid)) {
                add_msgid_src($msgid, $msgid, $file_name);

                # check for plural params
                if (defined($params[$pattern->{param} + 1])) {
                    my $hash_raw = $params[$pattern->{param} + 1];
                    if (defined($hash_raw)) {
                        my %params_opt = parse_hash($hash_raw);
                        if (defined($params_opt{plural})) {
                            add_msgid_src($msgid.'_plural', $params_opt{plural}, $file_name);
                        }
                    } 
                }
            } 
            else {
                # msgid was not a string... ignoring
                print "Warning: msgid not a string '$file_name' (L$ln) - '" . $params[$pattern->{param}] . "'\n" if ($warnings);
            }
        }
        else {
            # msgid was undefined... ignoring
            print "Warning: msgid undefined '$file_name' (L$ln)\n" if ($warnings);
        }
    }
}

sub type_export {
    my ($file_name, $pattern, @file_lines) = @_;

    if (!file_wanted($file_name, @{ $pattern->{files} })) {
        # skip unwanted files
        return;
    }

    my $lines = join('', @file_lines);
    if (my ($params_raw) = $lines =~ m/export default \[(.+)\];\s*/s) {
        my @item_list = parse_params($params_raw);
        foreach my $item_raw (@item_list) {
            my %params = parse_hash($item_raw);
            if (defined($params{$pattern->{param}})) {
                my $msgid = $params{$pattern->{param}};
                $msgid =~ s/^locale_id_//;
                add_msgid_src($msgid, $msgid, $file_name);
            }
            else {
                print "Error: undefined param in exports rule '$file_name' - '" . $item_raw . "'\n";
            }
        }
    } 
    else {
        print "Error: could not find export in file '$file_name'\n";
    }
}

sub type_regex {
    my ($file_name, $pattern, @file_lines) = @_;

    if (!file_wanted($file_name, @{ $pattern->{files} })) {
        # skip unwanted files
        return;
    }

    my $regex = $pattern->{regex};
    my $lines = join('', @file_lines);
    if (my ($params_raw) = $lines =~ m/$regex/s) {
        my %matches = parse_hash($params_raw);
        foreach my $key (keys %matches) {
            my $msgid = $matches{$key};
            add_msgid_src($msgid, $msgid, $file_name);
        }
    }
    else {
        print "Error: could not find regex in file '$file_name'\n";
    }
}

sub print_stats {
    # removed translations
    my @removed;
    foreach my $key (keys %msgids_po) {
        if (!defined($msgids_src{$key})) {
            push(@removed, $key);
        }
    }
    my $total_removed = scalar(@removed);
    if ($total_removed > 0) {
        print "Removed translations ($total_removed):\n\n\t'" . join("'\n\t'", @removed) . "'\n\n";
    }

    # added translations
    my @added;
    foreach my $key (keys %msgids_src) {
        if (!defined($msgids_po{$key})) {
            push(@added, $key);
        }
    }
    my $total_added = scalar(@added);
    if ($total_added > 0) {
        print "Added translations ($total_added):\n\n\t'" . join("'\n\t'", @added) . "'\n\n";
    }
    
    # statistics
    my $total_translations = scalar(keys %msgids_src);
    my $total_files = files_msgids_hash();
    my $total_plurals = 0;
    foreach my $msgid (keys %msgids_src) {
        if ($msgid =~ m/_plural$/) {
            $total_plurals++;
        }
    }
    print "Totals:\n\ttraslations - $total_translations\n\tplurals - $total_plurals\n\tfiles - $total_files\n\n";
}

sub write_po {
    my $write_file = shift;

    # open and lock the po file for writing
    print "Writing to file: '$write_file'\n";
    open(my $fh, '>:encoding(UTF-8)', $write_file) || die "Could not open file '$write_file' $!";
    flock($fh, 2);
    
    my %used;

    # write out the msgid that are used in multiple files
    foreach my $msgid (sort(keys %msgids_src)) {
        if (scalar(keys %{$msgids_src{$msgid}{files}}) > 1) {
            my @files = sort(keys %{$msgids_src{$msgid}{files}});

            # print the file names as comments
            foreach my $file (@files) {
                print $fh "#: $file\n";
            }

            my $msgstr = $msgids_src{$msgid}{msgstr};

            # sanity check
            if (!defined($msgstr)) {
                print "Error: undefined msgstr writing po '$msgid'\n";
                next;
            }

            print $fh qq`msgid "$msgid"\nmsgstr "$msgstr"\n\n`;
            $used{$msgid}++;
        } 
    }
    print $fh "\n";

    my %files_hash = files_msgids_hash();
    my @files = sort(keys %files_hash);
    foreach my $file (@files) {
        my @msgids = @{ $files_hash{$file} };
        my @add;

        # check if we already added this msgid
        foreach my $msgid (sort @msgids) {
            if (!defined($used{$msgid})) {
                push(@add, $msgid);
            }
        }

        # add the unadded msgids
        if (scalar(@add) > 0) {
            foreach my $msgid (@add) {
                my $msgstr = $msgids_src{$msgid}{msgstr};

                # sanity check
                if (!defined($msgstr)) {
                    print "Error: undefined msgstr writing po '$msgid'\n";
                    next;
                }

                print $fh qq`#: $file\nmsgid "$msgid"\nmsgstr "$msgstr"\n\n`;
                $used{$msgid}++;
            }
            print $fh "\n";
        }
    }
    close($fh);
    my $file_size = -s $write_file;
    print "Wrote $file_size bytes\n";
}


########  Utils  ########

sub parse_hash {
    my $hash_raw = shift;

    # extract the string from inside the braces
    my ($hash_str) = $hash_raw =~ m/^\s*\{\s*(.*)\s*\}\s*$/s;

    # sanity check
    if (!defined($hash_str)) {
        print "Error: string not a hash '$hash_raw'\n";
        return;
    }

    my %hash;
    my @hash_parts = parse_params($hash_str);
    foreach my $hash_item (@hash_parts) {
        my @item_parts = split(':', $hash_item);

        # sanity check
        if (!defined($item_parts[0]) || !defined($item_parts[1])) {
            print "Error: failed to parse hash '$hash_raw'\n";
            next;
        }

        # strip quotes from strings
        $item_parts[0] =~ s/^\s*['"`]?|[`"']?\s*$//g;
        if ($item_parts[1] =~ s/^\s*['"`]?|[`"']?\s*$//g) {
            $item_parts[1] =~ s/\\\{/{/g;
            $item_parts[1] =~ s/\\\}/}/g;
            $item_parts[1] =~ s/\\\'/'/g; 
        }

        $hash{$item_parts[0]} = $item_parts[1];
    }
    return %hash;
}

sub parse_params {
    my @str_parts = split('', shift);
    
    my @params;
    my $param_start = -1;
    my $open_quote = 0;
    my $open_brace = 0;

    # iterate over the string 
    for (my $i = 0; $i < @str_parts; $i++) {
        my $token = $str_parts[$i];

        if ($token =~ m/['"`]/ && $str_parts[$i-1] ne '\\') {
            # track open and closed quotes
            if ($param_start == -1 && !$open_quote) {
                # we found a string
                $param_start = $i;
            }
            $open_quote = !$open_quote;
        }
        elsif ($token =~ m/[{}]/) {
            # track open and closed braces
            if ($token eq '{') {
                if ($param_start == -1 && !$open_brace) {
                    # we found an object
                    $param_start = $i;
                }
                $open_brace++;
            }
            else {
                $open_brace--;
            }
        }
        elsif ($token =~ m/\S/ && $param_start == -1) {
            # we found a var
            $param_start = $i;
        }

        if (($token eq ',' || $i == @str_parts -1) && !$open_quote && !$open_brace && $param_start > -1) {
            # we found a full param
            my $deduct = ($token eq ',') ? 1 : 0;
            my $param_new = join('', @str_parts[$param_start..$i-$deduct]);

            # strip leading and trailing spaces
            $param_new =~ s/^\s+|\s+$//g;

            push(@params, $param_new);

            # reset the param start index
            $param_start = -1;
        }
    }
    return @params;
}

# strips $base from absolute file path
sub get_file_path {
    my $file = shift;
    $file =~ s/^\Q$base\E//i;
    return $file;
}

# returns hash of { file => [msgids] }
sub files_msgids_hash {
    my %files;
    foreach my $msgid (keys %msgids_src) {
        foreach my $file (keys %{ $msgids_src{$msgid}{files} }) {
            push(@{ $files{$file} }, $msgid);
        }
    }
    return %files;
}

# extracts msgid from quoted string
sub extract_string {
    my $str = shift;
    if (defined($str) && $str =~ m/^['"'](.*?)['"']$/) {
        my $msgid = $1;
        $msgid =~ s/locale_id_//;
        $msgid =~ s/\\\{/{/g;
        $msgid =~ s/\\\}/}/g;
        $msgid =~ s/\\\'/'/g;
        return $msgid;
    }
    return undef;
}

# check wanted array contains file
sub file_wanted {
    my ($str, @wanted) = @_;
    foreach my $item (@wanted) {
        if ($str =~ m/\Q$item\E$/i) {
            return 1;
        }
    }
    return 0;
}

# add
sub add_msgid_src {
    my ($msgid, $msgstr, $file_name) = @_;
    $msgids_src{$msgid}{msgstr} = $msgstr;
    $msgids_src{$msgid}{files}{$file_name}++;
}
